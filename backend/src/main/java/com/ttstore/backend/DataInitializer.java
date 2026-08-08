package com.ttstore.backend;

import com.ttstore.backend.model.Usuario;
import com.ttstore.backend.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // Cria o admin padrão se não existir nenhum usuário no sistema
        if (usuarioRepository.count() == 0) {
            System.out.println("=======================================================");
            System.out.println("  Nenhum usuario encontrado. Criando admin padrao...");
            System.out.println("  Login: admin");
            System.out.println("  Senha: admin123");
            System.out.println("=======================================================");

            Usuario admin = new Usuario(
                "admin",
                passwordEncoder.encode("admin123"),
                "ADMIN"
            );
            usuarioRepository.save(admin);

            System.out.println("  Admin criado com sucesso!");
        } else {
            System.out.println("=======================================================");
            System.out.println("  Sistema iniciado. Usuarios cadastrados: " + usuarioRepository.count());
            System.out.println("=======================================================");
        }
    }
}
