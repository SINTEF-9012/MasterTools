using System;
using System.Collections.Generic;
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

            var interpolation = new LatLngInterpolation();
            //interpolation.AddPoint(39.883154, 25.223207, 13859, 13433);
            //interpolation.AddPoint(39.988642, 25.036114, 2066, 22463);
            //interpolation.AddPoint(39.831807, 25.053073, 2854, 9390);

            var start = DotSpatial.Projections.KnownCoordinateSystems.Geographic.World.WGS1984;
            var end = DotSpatial.Projections.KnownCoordinateSystems.Projected.World.WebMercator;

            var projection = new double[2] { 39.905572, 25.221947};
            
            DotSpatial.Projections.Reproject.ReprojectPoints(projection, null, start, end, 0, 1);
            /*Console.WriteLine(a[0] + " === "+a[1]);
            a[0] += 1000;
            DotSpatial.Projections.Reproject.ReprojectPoints(a, null, end, start, 0, 1);
            Console.WriteLine(a[0] + " === " + a[1]);

            interpolation.AddPoint(39.785307, 25.35754, 22315, 5101);
            interpolation.AddPoint(39.905572, 25.221947, 14258, 15819);
            interpolation.AddPoint(39.871295, 25.051542, 2837, 12671);
            interpolation.AddPoint(39.790971, 25.236764, 14536, 5780);
            interpolation.AddPoint(39.96116, 25.273177, 17191, 19864);

            var p = interpolation.ToLatLng(14000, 9000);
            var c = interpolation.ToXY(p.Lat, p.Lng);
            Console.WriteLine(c.X + " -- "+c.Y);
            Console.ReadLine();

            return;*/

            server.Start();


            while (true)
            {
                try
                {
                    TcpClient client = server.AcceptTcpClient();

                    var w = new StreamWriter(client.GetStream());
                    
                    var stream = new StreamReader(client.GetStream());

                    //var centerLocation = new Location();

                    while (client.GetStream().CanRead)
                    {

                        var message = stream.ReadLine();

                        Console.WriteLine("Managing: " + message);

                        if (message.StartsWith("INIT:"))
                        {
                            /*centerLocation = new Location
                                {
                                    lat=39.883162,
                                    lng=25.223201
                                };*/
                            continue;
                        }


                        // TODO send scripts
                        //w.WriteLine("group abcd addWaypoint [[14352,15000,100],0] setWayPointType \"MOVE\";");
                        //w.Flush();

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



                            /*lat = 42.507847,//59.944821,*
                                    lng = 5.973579//10.712956*/

                            /*var location = new Location(centerLocation);

                            location.Move(270, 13856.3*(1/0.75));
                            location.Move(180, 13433.7 * (1 / 0.75));*/

                            var x = (double) argument[1];
                            var y = (double) argument[2];

                            //22315, 5101
                            //14258, 15819

                            var plusX = (x - 14258) / 0.75;
                            var plusY = (y - 15819) / 0.75;

                            var p = new double[2] {plusY + projection[0], plusX + projection[1]};

                            DotSpatial.Projections.Reproject.ReprojectPoints(p, null, end, start, 0, 1);

                            /*location.Move(
                                (Math.Tan(x/y)*57.2957795)%360,
                                Math.Sqrt(x * x + y * y) * (1 / 0.75)
                                );*/
                            //var location = interpolation.ToLatLng(x, y);

                            patient.Location = new LatLng()
                            {
                                lat = p[0],
                                lng = p[1]
                            };

                            //Console.WriteLine(x + " canard "+y + " => " + Math.Sqrt(x*x+y*y) + " ou "+centerLocation.DistanceTo(location));

                            /*if (patient.ID.Contains("antoinep"))
                            {
                                Console.WriteLine("X: " + location.X+"\tY:"+location.Y);
                                Console.WriteLine("Lat: " + location.Lat + "\tLng:" + location.Lng);
                            }*/
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
