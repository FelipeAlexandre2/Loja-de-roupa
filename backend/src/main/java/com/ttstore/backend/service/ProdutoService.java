package com.ttstore.backend.service;

import com.ttstore.backend.model.Produto;
import com.ttstore.backend.repository.ProdutoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ProdutoService {

    private final ProdutoRepository produtoRepository;

    public ProdutoService(ProdutoRepository produtoRepository) {
        this.produtoRepository = produtoRepository;
    }

    public List<Produto> listarTodos() {
        return produtoRepository.findAll();
    }

    public Optional<Produto> buscarPorId(Long id) {
        return produtoRepository.findById(id);
    }

    public Optional<Produto> buscarPorCodigoBarra(String codigoBarra) {
        return produtoRepository.findByCodigoBarra(codigoBarra);
    }

    @Transactional
    public Produto salvar(Produto produto) {
        return produtoRepository.save(produto);
    }

    @Transactional
    public void excluir(Long id) {
        produtoRepository.deleteById(id);
    }
    
    @Transactional
    public void atualizarEstoque(Long id, int quantidadeRetirada) {
        Produto produto = produtoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Produto não encontrado"));
            
        if (produto.getQuantidadeEstoque() < quantidadeRetirada) {
            throw new RuntimeException("Estoque insuficiente para o produto: " + produto.getNome());
        }
        
        produto.setQuantidadeEstoque(produto.getQuantidadeEstoque() - quantidadeRetirada);
        produtoRepository.save(produto);
    }
}
