using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using Arma2Net.AddInProxy;

namespace Arma2MasterPlugin
{

    [AddIn("Arma2Master")]
    public class Arma2Master : AddIn
    {
        
        private bool _isConnecting = false;

        // Socket endpoint settings
        private string _hostName = "localhost";
        private int _port = 7845;

        private TcpClient _client;
        private StreamWriter _streamWriter;
        private StreamReader _streamReader;

        // List of strings to send
        private readonly Queue<string> _action = new Queue<string>();
        private string _messageToSend = "";

        private string centerLocation = "";

        public override string Invoke(string args, int maxResultSize)
        {
            try
            {
                if (args.StartsWith("INIT:"))
                {
                    if (_client != null && _client.Connected)
                    {
                        _action.Enqueue("hint \"Already connected\";");
                    }
                    else
                    {
                        var endpoint = args.Split(':');
                        if (endpoint.Length >= 5)
                        {

                            _hostName = endpoint[1];
                            int.TryParse(endpoint[2], out _port);
                            centerLocation = endpoint[3] + "," + endpoint[4];
                        }
                        else
                        {
                            _action.Enqueue("hint \"Wrong connexion format\";");
                        }
                    }
                }
                else
                {
                    _messageToSend = args;
                }

                lock (this)
                {
                    if (_client == null && !_isConnecting)
                    {
                        var thread = new Thread(delegate()
                          {
                              try
                              {
                                  

                                  _client = new TcpClient(_hostName, _port);
                                  var stream = _client.GetStream();

                                  if (stream.CanWrite)
                                  {
                                      _streamWriter = new StreamWriter(stream);
                                      _streamWriter.WriteLine("INIT:"+centerLocation);
                                      _streamWriter.Flush();
                                  }
                                  else
                                  {
                                      throw new Exception("Can not write on the stream");
                                  }

                                  if (stream.CanRead)
                                  {
                                      _streamReader = new StreamReader(stream);
                                  }
                                  else
                                  {
                                      throw new Exception("Can't read the stream");
                                  }
                                  
                                  _action.Enqueue("connected");

                                  string command;
                                  
                                    while ((command = _streamReader.ReadLine()) != null) 
                                    {
                                        _action.Enqueue(command);
                                    }
                                  
                              }
                              catch (Exception e)
                              {
                                  _client = null;
                                  _isConnecting = false;
                                  _action.Enqueue("hint \"" + e.Message.Replace("\"", "\"\"") + "\";");
                              }
                          });

                        _isConnecting = true;
                        thread.Start();
                    }
                    else if (_client != null && _client.Connected)
                    {
                        _isConnecting = false;
                        if (_messageToSend.Length > 0)
                        {

                            _streamWriter.WriteLine(_messageToSend);
                            _messageToSend = "";
                            _streamWriter.Flush();
                            _client.GetStream().Flush();


                        }
                    }
                }
            }
            catch (Exception e)
            {
                _client = null;
                _isConnecting = false;
                _action.Enqueue(e.Message);
            }

            var responseObject = _action.Count > 0 ? _action.Dequeue() : "nop";

            return responseObject;


        }

        public override void Unload()
        {
            if (_client.Connected)
            {
                _client.Close();
                _isConnecting = false;
            }
            base.Unload();
        }

    }
}
