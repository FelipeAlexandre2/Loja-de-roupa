package com.ttstore.backend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cortes_barbearia")
public class CorteBarbearia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String barbeiro; // "Jacson" ou "Mizael"

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Column(name = "forma_pagamento", nullable = true, columnDefinition = "VARCHAR(255) DEFAULT 'Dinheiro'")
    private String formaPagamento = "Dinheiro"; // "Dinheiro", "Pix", "Cartão"

    @Column(name = "tipo_servico", nullable = true, columnDefinition = "VARCHAR(255) DEFAULT 'Cabelo'")
    private String tipoServico = "Cabelo"; // "Cabelo", "Barba", "Sobrancelha"

    @Column(name = "data_corte", nullable = false)
    private LocalDateTime dataCorte;

    public CorteBarbearia() {
    }

    @PrePersist
    public void prePersist() {
        if (this.dataCorte == null) {
            this.dataCorte = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBarbeiro() {
        return barbeiro;
    }

    public void setBarbeiro(String barbeiro) {
        this.barbeiro = barbeiro;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public String getFormaPagamento() {
        return formaPagamento;
    }

    public void setFormaPagamento(String formaPagamento) {
        this.formaPagamento = formaPagamento;
    }

    public String getTipoServico() {
        return tipoServico;
    }

    public void setTipoServico(String tipoServico) {
        this.tipoServico = tipoServico;
    }

    public LocalDateTime getDataCorte() {
        return dataCorte;
    }

    public void setDataCorte(LocalDateTime dataCorte) {
        this.dataCorte = dataCorte;
    }
}
