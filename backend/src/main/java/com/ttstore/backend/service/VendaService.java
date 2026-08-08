package com.ttstore.backend.service;

import com.ttstore.backend.model.ItemVenda;
import com.ttstore.backend.model.Produto;
import com.ttstore.backend.model.Venda;
import com.ttstore.backend.repository.VendaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class VendaService {

    private final VendaRepository vendaRepository;
    private final ProdutoService produtoService;

    public VendaService(VendaRepository vendaRepository, ProdutoService produtoService) {
        this.vendaRepository = vendaRepository;
        this.produtoService = produtoService;
    }

    public List<Venda> listarTodas() {
        return vendaRepository.findAll();
    }

    public Optional<Venda> buscarPorId(Long id) {
        return vendaRepository.findById(id);
    }

    @Transactional
    public Venda realizarVenda(List<ItemVenda> itens, String formaPagamento) {
        Venda venda = new Venda();
        BigDecimal total = BigDecimal.ZERO;

        if (formaPagamento != null && !formaPagamento.isBlank()) {
            venda.setFormaPagamento(formaPagamento);
        }

        for (ItemVenda item : itens) {
            Produto produto = produtoService.buscarPorId(item.getProduto().getId())
                    .orElseThrow(() -> new RuntimeException("Produto não encontrado: " + item.getProduto().getId()));

            // Atualiza estoque
            produtoService.atualizarEstoque(produto.getId(), item.getQuantidade());

            // Define propriedades do item
            item.setProduto(produto);
            item.setPrecoUnitario(produto.getPreco());
            venda.addItem(item);

            // Soma o total da venda
            BigDecimal subtotal = produto.getPreco().multiply(BigDecimal.valueOf(item.getQuantidade()));
            total = total.add(subtotal);
        }

        venda.setTotal(total);
        return vendaRepository.save(venda);
    }

    public Map<String, Object> buscarResumoDoDia() {
        LocalDateTime inicioDoDia = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime fimDoDia = LocalDateTime.now().toLocalDate().atTime(LocalTime.MAX);

        List<Venda> vendasHoje = vendaRepository.findByDataHoraBetween(inicioDoDia, fimDoDia);

        BigDecimal totalArrecadado = BigDecimal.ZERO;
        int totalItensVendidos = 0;

        for (Venda venda : vendasHoje) {
            if (venda.getTotal() != null) {
                totalArrecadado = totalArrecadado.add(venda.getTotal());
            }
            if (venda.getItens() != null) {
                for (ItemVenda item : venda.getItens()) {
                    totalItensVendidos += item.getQuantidade();
                }
            }
        }

        Map<String, Object> resumo = new HashMap<>();
        resumo.put("data", LocalDateTime.now().toLocalDate().toString());
        resumo.put("quantidadeVendas", vendasHoje.size());
        resumo.put("totalArrecadado", totalArrecadado);
        resumo.put("totalItensVendidos", totalItensVendidos);

        return resumo;
    }
}
