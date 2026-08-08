package com.ttstore.backend;

import com.ttstore.backend.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Base64;

class BackendApplicationTests {

	@Test
	void testTokenPayload() {
		try {
			JwtUtil jwtUtil = new JwtUtil();
			UserDetails userDetails = User.builder()
					.username("admin")
					.password("password")
					.roles("ADMIN")
					.build();
			String token = jwtUtil.generateToken(userDetails);
			System.out.println("TEST_TOKEN: " + token);
			
			String[] parts = token.split("\\.");
			String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
			System.out.println("TEST_PAYLOAD: " + payload);
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

}
