package com.ttstore.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime dataHora;

    @Column(nullable = false)
    private String usuario;

    private String role;

    @Column(nullable = false)
    private String acao; // "EXCLUSAO", "EDICAO", "CRIACAO", "LOGIN", "ACESSO"

    @Column(nullable = false)
    private String modulo; // "Barbearia", "PDV", "Estoque", "Caixa", "Fiado", "Usuários", "Autenticação"

    @Column(columnDefinition = "TEXT")
    private String descricao;

    private String ip;

    public AuditLog() {
        this.dataHora = LocalDateTime.now();
    }

    public AuditLog(String usuario, String role, String acao, String modulo, String descricao, String ip) {
        this.dataHora = LocalDateTime.now();
        this.usuario = (usuario != null && !usuario.isBlank()) ? usuario : "Sistema";
        this.role = (role != null && !role.isBlank()) ? role : "USER";
        this.acao = acao;
        this.modulo = modulo;
        this.descricao = descricao;
        this.ip = (ip != null && !ip.isBlank()) ? ip : "127.0.0.1";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDateTime getDataHora() { return dataHora; }
    public void setDataHora(LocalDateTime dataHora) { this.dataHora = dataHora; }
    public String getUsuario() { return usuario; }
    public void setUsuario(String usuario) { this.usuario = usuario; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getAcao() { return acao; }
    public void setAcao(String acao) { this.acao = acao; }
    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }
}
