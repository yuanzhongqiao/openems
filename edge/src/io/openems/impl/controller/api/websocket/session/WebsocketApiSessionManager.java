package io.openems.impl.controller.api.websocket.session;

import java.util.Optional;

import org.java_websocket.WebSocket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openems.api.security.User;
import io.openems.common.session.SessionManager;
import io.openems.core.utilities.websocket.EdgeWebsocketHandler;

public class WebsocketApiSessionManager extends SessionManager<WebsocketApiSession, WebsocketApiSessionData> {

	private static Logger log = LoggerFactory.getLogger(WebsocketApiSessionManager.class);

	@Override
	public WebsocketApiSession _createNewSession(String token, WebsocketApiSessionData data) {
		return new WebsocketApiSession(token, data);
	}

	private Optional<WebsocketApiSession> createSessionForUser(Optional<User> userOpt, WebSocket websocket) {
		if (userOpt.isPresent()) {
			WebsocketApiSessionData data = new WebsocketApiSessionData(userOpt.get(),
					new EdgeWebsocketHandler(websocket));
			String token = generateToken();
			WebsocketApiSession session = createNewSession(token, data);
			return Optional.of(session);
		}
		return Optional.empty();
	}

	public Optional<WebsocketApiSession> authByUserPassword(String username, String password, WebSocket websocket) {
		Optional<User> user = User.authenticate(username, password);
		return createSessionForUser(user, websocket);
	}

	public Optional<WebsocketApiSession> authByPassword(String password, WebSocket websocket) {
		Optional<User> user = User.authenticate(password);
		return createSessionForUser(user, websocket);
	}

	public Optional<WebsocketApiSession> authBySession(String token) {
		Optional<WebsocketApiSession> sessionOpt = getSessionByToken(token);
		if (sessionOpt.isPresent()) {
			WebsocketApiSession session = sessionOpt.get();
			log.info("User[" + session.getData().getUser().getName() + "] authenticated by " + //
					"session[" + token + "].");
		} else {
			log.info("Authentication by session failed.");
		}
		return sessionOpt;
	}
}
