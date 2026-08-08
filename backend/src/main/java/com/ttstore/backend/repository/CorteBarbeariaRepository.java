package com.ttstore.backend.repository;

import com.ttstore.backend.model.CorteBarbearia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CorteBarbeariaRepository extends JpaRepository<CorteBarbearia, Long> {
    
    // Busca os cortes entre um período (por exemplo: hoje)
    List<CorteBarbearia> findByDataCorteBetweenOrderByDataCorteDesc(LocalDateTime inicio, LocalDateTime fim);

    List<CorteBarbearia> findByDataCorteBetween(LocalDateTime inicio, LocalDateTime fim);
}
