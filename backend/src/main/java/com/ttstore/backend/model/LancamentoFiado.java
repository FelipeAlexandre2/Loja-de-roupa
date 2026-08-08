package com.ttstore.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lancamentos_fiado")
public class LancamentoFiado {

    public enum Tipo { DEBITO, PAGAMENTO }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_fiado_id", nullable = false)
    @JsonIgnore
    private ClienteFiado clienteFiado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Tipo tipo;

    @Column(nullable = false)
    private Double valor;

    private String descricao;

    @Column(nullable = false)
    private LocalDateTime data;

    public LancamentoFiado() {}

    public Long getId()                             { return id; }
    public void setId(Long id)                     { this.id = id; }

    public ClienteFiado getClienteFiado()                       { return clienteFiado; }
    public void setClienteFiado(ClienteFiado clienteFiado)     { this.clienteFiado = clienteFiado; }

    public Tipo getTipo()                           { return tipo; }
    public void setTipo(Tipo tipo)                 { this.tipo = tipo; }

    public Double getValor()                        { return valor; }
    public void setValor(Double valor)             { this.valor = valor; }

    public String getDescricao()                    { return descricao; }
    public void setDescricao(String descricao)     { this.descricao = descricao; }

    public LocalDateTime getData()                  { return data; }
    public void setData(LocalDateTime data)        { this.data = data; }
}
