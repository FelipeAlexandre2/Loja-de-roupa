package com.ttstore.backend.service;

import com.ttstore.backend.model.CorteBarbearia;
import com.ttstore.backend.model.ItemVenda;
import com.ttstore.backend.model.MovimentacaoCaixa;
import com.ttstore.backend.model.Produto;
import com.ttstore.backend.model.Venda;
import com.ttstore.backend.repository.CorteBarbeariaRepository;
import com.ttstore.backend.repository.MovimentacaoCaixaRepository;
import com.ttstore.backend.repository.ProdutoRepository;
import com.ttstore.backend.repository.VendaRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final VendaRepository vendaRepository;
    private final ProdutoRepository produtoRepository;
    private final CorteBarbeariaRepository corteBarbeariaRepository;
    private final MovimentacaoCaixaRepository movimentacaoCaixaRepository;

    public DashboardService(VendaRepository vendaRepository, ProdutoRepository produtoRepository,
                            CorteBarbeariaRepository corteBarbeariaRepository,
                            MovimentacaoCaixaRepository movimentacaoCaixaRepository) {
        this.vendaRepository = vendaRepository;
        this.produtoRepository = produtoRepository;
        this.corteBarbeariaRepository = corteBarbeariaRepository;
        this.movimentacaoCaixaRepository = movimentacaoCaixaRepository;
    }

    public Map<String, Object> getDashboardResumo() {
        // 1. Total de Vendas Hoje
        LocalDateTime inicioDoDia = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime fimDoDia = LocalDateTime.now().toLocalDate().atTime(LocalTime.MAX);
        List<Venda> vendasHoje = vendaRepository.findByDataHoraBetween(inicioDoDia, fimDoDia);

        BigDecimal totalRSHoje = BigDecimal.ZERO;
        for (Venda v : vendasHoje) {
            if (v.getTotal() != null) {
                totalRSHoje = totalRSHoje.add(v.getTotal());
            }
        }

        // 2. Vendas dos Ultimos 30 Dias e 3. Produto Mais Vendido
        LocalDateTime trintaDiasAtras = LocalDateTime.now().minusDays(30);
        List<Venda> vendas30Dias = vendaRepository.findByDataHoraAfter(trintaDiasAtras);

        BigDecimal totalRS30Dias = BigDecimal.ZERO;
        Map<Produto, Integer> produtosAgrupados = new HashMap<>();

        for (Venda v : vendas30Dias) {
            if (v.getTotal() != null) {
                totalRS30Dias = totalRS30Dias.add(v.getTotal());
            }
            if (v.getItens() != null) {
                for (ItemVenda item : v.getItens()) {
                    Produto p = item.getProduto();
                    if (p != null) {
                        produtosAgrupados.put(p, produtosAgrupados.getOrDefault(p, 0) + item.getQuantidade());
                    }
                }
            }
        }

        String produtoMaisVendidoNome = "Nenhum";
        int maxVendas = 0;
        for (Map.Entry<Produto, Integer> entry : produtosAgrupados.entrySet()) {
            if (entry.getValue() > maxVendas && entry.getKey() != null && entry.getKey().getNome() != null) {
                maxVendas = entry.getValue();
                produtoMaisVendidoNome = entry.getKey().getNome() + " (" + maxVendas + " un)";
            }
        }

        // 4. Peças físicamente cadastradas no estoque
        List<Produto> todosProdutos = produtoRepository.findAll();
        int totalPecasEstoque = 0;
        for (Produto p : todosProdutos) {
            if (p.getQuantidadeEstoque() != null) {
                totalPecasEstoque += p.getQuantidadeEstoque();
            }
        }

        Map<String, Object> resumo = new HashMap<>();
        resumo.put("vendasHoje", totalRSHoje);
        resumo.put("vendas30Dias", totalRS30Dias);
        resumo.put("produtoMaisVendido", produtoMaisVendidoNome);
        resumo.put("totalPecasEstoque", totalPecasEstoque);
        resumo.put("caixaHoje", montarResumoCaixa(inicioDoDia.toLocalDate()));

        List<Map<String, Object>> caixaUltimos30Dias = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            caixaUltimos30Dias.add(montarResumoCaixa(LocalDate.now().minusDays(i)));
        }
        resumo.put("caixaUltimos30Dias", caixaUltimos30Dias);
        return resumo;
    }

    private Map<String, Object> montarResumoCaixa(LocalDate data) {
        LocalDateTime inicio = data.atStartOfDay();
        LocalDateTime fim = data.atTime(LocalTime.MAX);

        List<Venda> vendas = vendaRepository.findByDataHoraBetween(inicio, fim);
        List<CorteBarbearia> cortes = corteBarbeariaRepository.findByDataCorteBetween(inicio, fim);
        List<MovimentacaoCaixa> movimentacoes = movimentacaoCaixaRepository.findByDataHoraBetween(inicio, fim);

        BigDecimal entradas = BigDecimal.ZERO;
        BigDecimal saidas = BigDecimal.ZERO;
        int quantidade = 0;

        for (Venda venda : vendas) {
            entradas = entradas.add(valorSeguro(venda.getTotal()));
            quantidade++;
        }
        for (CorteBarbearia corte : cortes) {
            entradas = entradas.add(valorSeguro(corte.getValor()));
            quantidade++;
        }
        for (MovimentacaoCaixa movimentacao : movimentacoes) {
            if ("SANGRIA".equalsIgnoreCase(movimentacao.getTipo())) {
                saidas = saidas.add(valorSeguro(movimentacao.getValor()));
            } else if ("SUPRIMENTO".equalsIgnoreCase(movimentacao.getTipo())) {
                entradas = entradas.add(valorSeguro(movimentacao.getValor()));
            }
            quantidade++;
        }

        Map<String, Object> resumo = new HashMap<>();
        resumo.put("data", data.toString());
        resumo.put("entradas", entradas);
        resumo.put("saidas", saidas);
        resumo.put("saldo", entradas.subtract(saidas));
        resumo.put("movimentacoes", quantidade);
        return resumo;
    }

    private BigDecimal valorSeguro(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }
}
