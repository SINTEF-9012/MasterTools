import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.concurrent.CountDownLatch;

import javax.websocket.*;

import org.glassfish.tyrus.client.ClientManager;

import com.google.protobuf.InvalidProtocolBufferException;

import NodeMaster.NodeMaster;
import SintefMaster.SintefMaster;

@ClientEndpoint
public class Main {

	@OnOpen
	public void onOpen(Session session) {
		System.out.println("Connexion open");
	}
	
	@OnClose
	public void onClose(Session session) {
		System.out.println("Connexion close");
	}
	
	@OnMessage
	public void onMessage(byte[] lapin, Session session) {
		System.out.println("messaaage");
		try {
			//SintefMaster.Object b = SintefMaster.Object.parseFrom(lapin);
			NodeMaster.Transaction transaction = NodeMaster.Transaction.parseFrom(lapin);
			System.out.println(transaction.getSenderID());
		} catch (InvalidProtocolBufferException e) {
			System.out.println("J'arrive pas à lire le message :'(");
		}
	}
	
	public static void main(String[] args) {
		
		ClientManager client = ClientManager.createClient();
		CountDownLatch l = new CountDownLatch(1);
		
		try {
			client.connectToServer(Main.class, new URI("ws://localhost:8181/MasterHLA2Websockets"));

			l.await();
		} catch (DeploymentException | IOException | URISyntaxException | InterruptedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
	}

}
