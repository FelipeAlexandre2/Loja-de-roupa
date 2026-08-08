package com.ttstore.backend.controller;

import com.ttstore.backend.model.Produto;
import com.ttstore.backend.service.AuditService;
import com.ttstore.backend.service.ProdutoService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/produtos")
@CrossOrigin(origins = "*")
public class ProdutoController {

    private final ProdutoService produtoService;
    private final AuditService auditService;

    public ProdutoController(ProdutoService produtoService, AuditService auditService) {
        this.produtoService = produtoService;
        this.auditService = auditService;
    }

    @GetMapping
    public List<Produto> listarTodos() {
        return produtoService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Produto> buscarPorId(@PathVariable Long id) {
        return produtoService.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/barras/{codigoBarra}")
    public ResponseEntity<Produto> buscarPorCodigoBarra(@PathVariable String codigoBarra) {
        return produtoService.buscarPorCodigoBarra(codigoBarra)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Produto criar(@RequestBody Produto produto, HttpServletRequest request) {
        Produto salvo = produtoService.salvar(produto);
        auditService.log("CRIACAO", "Estoque",
            String.format("Cadastrou produto '%s' (Preço: R$ %.2f, Qtd: %d)", salvo.getNome(), salvo.getPreco(), salvo.getQuantidadeEstoque()), request);
        return salvo;
    }

    @PutMapping("/{id}")
    public ResponseEntity<Produto> atualizar(@PathVariable Long id, @RequestBody Produto produtoAtualizado, HttpServletRequest request) {
        return produtoService.buscarPorId(id).map(produto -> {
            produto.setNome(produtoAtualizado.getNome());
            produto.setCategoria(produtoAtualizado.getCategoria());
            produto.setTamanho(produtoAtualizado.getTamanho());
            produto.setPreco(produtoAtualizado.getPreco());
            produto.setQuantidadeEstoque(produtoAtualizado.getQuantidadeEstoque());
            produto.setImagemUrl(produtoAtualizado.getImagemUrl());
            produto.setCodigoBarra(produtoAtualizado.getCodigoBarra());
            Produto salvo = produtoService.salvar(produto);
            auditService.log("EDICAO", "Estoque",
                String.format("Editou produto '%s' (ID #%d, Preço: R$ %.2f, Qtd: %d)", salvo.getNome(), id, salvo.getPreco(), salvo.getQuantidadeEstoque()), request);
            return ResponseEntity.ok(salvo);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id, HttpServletRequest request) {
        return produtoService.buscarPorId(id).map(produto -> {
            produtoService.excluir(id);
            auditService.log("EXCLUSAO", "Estoque",
                String.format("Apagou produto '%s' (ID #%d)", produto.getNome(), id), request);
            return ResponseEntity.noContent().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
