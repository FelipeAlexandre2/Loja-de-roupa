package com.ttstore.backend.repository;

import com.ttstore.backend.model.Venda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VendaRepository extends JpaRepository<Venda, Long> {
    List<Venda> findByDataHoraBetween(LocalDateTime start, LocalDateTime end);

    List<Venda> findByDataHoraAfter(LocalDateTime start);
}
