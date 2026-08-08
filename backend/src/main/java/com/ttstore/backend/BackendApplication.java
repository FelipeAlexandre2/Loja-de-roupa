package com.ttstore.backend;

import com.ttstore.backend.model.Usuario;
import com.ttstore.backend.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner createAdminUser(UsuarioRepository repository, PasswordEncoder encoder) {
		return args -> {
			if (repository.findByLogin("admin").isEmpty()) {
				Usuario admin = new Usuario("admin", encoder.encode("ttstore123"), "ADMIN");
				repository.save(admin);
				System.out.println("Usuário padrão criado: admin / ttstore123");
			}
		};
	}
}
