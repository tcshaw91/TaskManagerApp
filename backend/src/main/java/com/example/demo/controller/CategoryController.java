package com.example.demo.controller;

import com.example.demo.dto.CategoryRequest;
import com.example.demo.model.Category;
import com.example.demo.model.User;
import com.example.demo.service.CategoryService;
import com.example.demo.service.UserService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final UserService userService;

    public CategoryController(CategoryService categoryService, UserService userService) {
        this.categoryService = categoryService;
        this.userService = userService;
    }

    private User getUserFromToken(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String username = Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(AuthController.SECRET.getBytes()))
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
        return userService.findByUsername(username).orElseThrow();
    }

    @GetMapping
    public ResponseEntity<List<Category>> getCategories(@RequestHeader("Authorization") String authHeader) {
        User user = getUserFromToken(authHeader);
        return ResponseEntity.ok(categoryService.getCategories(user));
    }

    @PostMapping
    public ResponseEntity<?> createCategory(@RequestHeader("Authorization") String authHeader,
                                            @RequestBody CategoryRequest request) {
        User user = getUserFromToken(authHeader);
        if (categoryService.countByUser(user) >= 32) {
            return ResponseEntity.badRequest().body(Map.of("error", "Maximum 32 categories reached"));
        }
        Category category = new Category(user, request.getName(), request.getSlot());
        return ResponseEntity.ok(categoryService.save(category));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCategory(@RequestHeader("Authorization") String authHeader,
                                            @PathVariable Long id,
                                            @RequestBody CategoryRequest request) {
        User user = getUserFromToken(authHeader);
        Optional<Category> existing = categoryService.getById(id);
        if (existing.isEmpty() || !existing.get().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Forbidden");
        }
        Category category = existing.get();
        category.setName(request.getName());
        return ResponseEntity.ok(categoryService.save(category));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCategory(@RequestHeader("Authorization") String authHeader,
                                            @PathVariable Long id) {
        User user = getUserFromToken(authHeader);
        Optional<Category> existing = categoryService.getById(id);
        if (existing.isEmpty() || !existing.get().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Forbidden");
        }
        categoryService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }
}