package com.ttstore.backend.repository;

import com.ttstore.backend.model.ClienteFiado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClienteFiadoRepository extends JpaRepository<ClienteFiado, Long> {
    List<ClienteFiado> findAllByOrderByNomeAsc();
}
