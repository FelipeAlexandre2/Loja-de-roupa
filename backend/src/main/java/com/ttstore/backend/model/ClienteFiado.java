package com.ttstore.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "clientes_fiado")
public class ClienteFiado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    private String telefone;

    private String cpf;

    private String endereco;

    @Column(nullable = false)
    private Double totalDevido = 0.0;

    private LocalDateTime ultimoLancamento;

    public ClienteFiado() {}

    public ClienteFiado(String nome, String telefone, String cpf, String endereco) {
        this.nome = nome;
        this.telefone = telefone;
        this.cpf = cpf;
        this.endereco = endereco;
        this.totalDevido = 0.0;
    }

    public Long getId()                         { return id; }
    public void setId(Long id)                 { this.id = id; }

    public String getNome()                     { return nome; }
    public void setNome(String nome)           { this.nome = nome; }

    public String getTelefone()                 { return telefone; }
    public void setTelefone(String telefone)   { this.telefone = telefone; }

    public String getCpf()                      { return cpf; }
    public void setCpf(String cpf)             { this.cpf = cpf; }

    public String getEndereco()                 { return endereco; }
    public void setEndereco(String endereco)   { this.endereco = endereco; }

    public Double getTotalDevido()              { return totalDevido; }
    public void setTotalDevido(Double v)       { this.totalDevido = v; }

    public LocalDateTime getUltimoLancamento()          { return ultimoLancamento; }
    public void setUltimoLancamento(LocalDateTime dt)  { this.ultimoLancamento = dt; }
}
