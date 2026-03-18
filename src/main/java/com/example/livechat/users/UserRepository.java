package com.example.livechat.users;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    @Query("select u from User u where lower(u.username) like lower(concat('%', :query, '%')) and u.id <> :excludeId order by u.username asc")
    List<User> searchByUsername(@Param("query") String query, @Param("excludeId") long excludeId, Pageable pageable);
}
