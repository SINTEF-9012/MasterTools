using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Security.Principal;
using System.Text;
using Arma2Net.AddInProxy;
using NodeMaster;
using ProtoBuf;
using WebSocketSharp;

namespace Arma2MasterConnector
{
    class Program
    {
        private string SenderID;

        private WebSocket Client;
        private MemoryStream Output;

        private static void Main(string[] args)
        {
            new Program("Arma2Master", "ws://localhost:8181/Arma2Master");
        }

        public Program(string SenderID, string path)
        {
			
            this.SenderID = SenderID;
            Output = new MemoryStream();
            Client = new WebSocket(path);

            Client.Connect();

            var server = new TcpListener(IPAddress.Any, 7845);

            var latLngProjection = DotSpatial.Projections.KnownCoordinateSystems.Geographic.World.WGS1984;
            var metersProjection = DotSpatial.Projections.KnownCoordinateSystems.Projected.World.WebMercator;

            server.Start();

            while (true)
            {
                try
                {
                    TcpClient client = server.AcceptTcpClient();

                    var w = new StreamWriter(client.GetStream());
                    
                    var stream = new StreamReader(client.GetStream());

                    var centerLocation = new double[2];
                    var metersX = 0.0;
                    var metersY = 0.0;
                    var scale = 1.0;

                    while (client.GetStream().CanRead)
                    {

                        var message = stream.ReadLine();


                        Console.WriteLine("Managing: " + message);

                        if (message != null && message.StartsWith("INIT:"))
                        {
                            

                            var init = message.Split(':');

                            // INIT:localhost:7845:39.905572:25.221947:14258:15819
                            double.TryParse(init[3], NumberStyles.Any, CultureInfo.InvariantCulture, out centerLocation[0]);
                            double.TryParse(init[4], NumberStyles.Any, CultureInfo.InvariantCulture, out centerLocation[1]);
                            double.TryParse(init[5], NumberStyles.Any, CultureInfo.InvariantCulture, out metersX);
                            double.TryParse(init[6], NumberStyles.Any, CultureInfo.InvariantCulture, out metersY);
                            double.TryParse(init[7], NumberStyles.Any, CultureInfo.InvariantCulture, out scale);

                            DotSpatial.Projections.Reproject.ReprojectPoints(centerLocation, null,
                                latLngProjection, metersProjection, 0, 1);
                            
                            continue;
                        }


                        // TODO send scripts

                        var loc = new double[2] {39.879419,25.231004};
                        DotSpatial.Projections.Reproject.ReprojectPoints(loc, null, latLngProjection, metersProjection, 0, 1);
                        loc[0] = (loc[0]-centerLocation[0])*scale + metersY;
                        loc[1] = (loc[1] - centerLocation[1])*scale + metersX;

                        var plusXplusX = (loc[1] - metersX) / scale;
                        var plusYplusY = (loc[0] - metersY) / scale;

                        var pp = new double[2] { plusYplusY + centerLocation[0], plusXplusX + centerLocation[1] };

                        DotSpatial.Projections.Reproject.ReprojectPoints(pp, null, metersProjection, latLngProjection, 0, 1);


                        Console.WriteLine(loc[0] + " --- " + loc[1]);
                        Console.WriteLine(pp[0] + " --- " + pp[1]);


                        w.WriteLine("group secondlapin addWaypoint [["+(int)loc[1]+","+(int)loc[0]+",100],0] setWayPointType \"MOVE\";");
                        w.Flush();

                        IList<object> arguments;

                        if (!Format.TrySqfAsCollection(message, out arguments))
                        {
                            throw new FormatException("You want to give a list");
                        }

                        var transaction = new NodeMaster.Transaction();
                        transaction.SenderID = SenderID;
                        transaction.PublishList = new Transaction.Content();

                        foreach (IList<object> argument in arguments)
                        {
                            if (argument.Count != 11)
                            {
                                throw new FormatException("This should be a list of [ID,lat,lng,alt,speedlat,speedlng,speedalt,heading,dammage,fatigue,fuel]");
                            }

                            var patient = new NodeMaster.PatientModel();
                            patient.ID = (string)argument[0];


                            var x = (double) argument[1];
                            var y = (double) argument[2];

                            var plusX = (x - metersX) / scale;
                            var plusY = (y - metersY) / scale;

                            var p = new double[2] {plusY + centerLocation[0], plusX + centerLocation[1]};

                            DotSpatial.Projections.Reproject.ReprojectPoints(p, null, metersProjection, latLngProjection, 0, 1);

                            patient.Location = new LatLng()
                            {
                                lat = p[0],
                                lng = p[1]
                            };

                            transaction.PublishList.PatientList.Add(patient);
                        }

                        Output.SetLength(0);
                        Serializer.Serialize(Output, transaction);
                        Output.Position = 0;

                        Client.Send(Output, (int)Output.Length);


                    }
                }
                catch (Exception e)
                {
                    Console.WriteLine(e);
                }
                
            }
        }
    }
}
