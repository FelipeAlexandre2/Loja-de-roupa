package com.ttstore.backend.repository;

import com.ttstore.backend.model.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProdutoRepository extends JpaRepository<Produto, Long> {
    List<Produto> findByCategoria(String categoria);
    List<Produto> findByNomeContainingIgnoreCase(String nome);
    java.util.Optional<Produto> findByCodigoBarra(String codigoBarra);
}
