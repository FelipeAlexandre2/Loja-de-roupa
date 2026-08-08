package com.ttstore.backend.model;

import java.util.List;

public class VendaRequest {
    private List<ItemVenda> itens;
    private String formaPagamento = "Dinheiro";

    public List<ItemVenda> getItens() { return itens; }
    public void setItens(List<ItemVenda> itens) { this.itens = itens; }

    public String getFormaPagamento() { return formaPagamento; }
    public void setFormaPagamento(String formaPagamento) { this.formaPagamento = formaPagamento; }
}
