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
            
            server.Start();


            while (true)
            {
                try
                {
                    TcpClient client = server.AcceptTcpClient();

                    var w = new StreamWriter(client.GetStream());
                    
                    var stream = new StreamReader(client.GetStream());

                    var centerLocation = new Location();

                    while (client.GetStream().CanRead)
                    {

                        var message = stream.ReadLine();

                        Console.WriteLine("Managing: " + message);

                        if (message.StartsWith("INIT:"))
                        {
                            centerLocation = new Location(message.Substring(5));
                            continue;
                        }


                        // TODO send scripts
                        //w.WriteLine("hint \"Vive les canards\";");
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

                            var location = new Location(centerLocation);

                            var x = (double) argument[1];
                            var y = (double) argument[2];

                            location.Move(
                                Math.Tan(x/y)*57.2957795,
                                Math.Sqrt(x*x + y*y)
                                );

                            patient.Location = new LatLng()
                            {
                                lat = location.lat,
                                lng = location.lng
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
