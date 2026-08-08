package com.ttstore.backend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "movimentacoes_caixa")
public class MovimentacaoCaixa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // "RETIRADA" (Sangria), "TROCO" (Suprimento), "ABERTURA", "FECHAMENTO"
    @Column(nullable = false)
    private String tipo;

    @Column(nullable = false)
    private BigDecimal valor;

    private BigDecimal valorContado;

    private BigDecimal diferenca;

    private String descricao;

    private LocalDateTime dataHora;

    @PrePersist
    public void prePersist() {
        if (dataHora == null) {
            dataHora = LocalDateTime.now();
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public BigDecimal getValorContado() {
        return valorContado;
    }

    public void setValorContado(BigDecimal valorContado) {
        this.valorContado = valorContado;
    }

    public BigDecimal getDiferenca() {
        return diferenca;
    }

    public void setDiferenca(BigDecimal diferenca) {
        this.diferenca = diferenca;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public LocalDateTime getDataHora() {
        return dataHora;
    }

    public void setDataHora(LocalDateTime dataHora) {
        this.dataHora = dataHora;
    }
}
