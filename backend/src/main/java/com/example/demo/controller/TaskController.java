package com.example.demo.controller;

import com.example.demo.dto.TaskRequest;
import com.example.demo.model.Task;
import com.example.demo.model.User;
import com.example.demo.service.TaskService;
import com.example.demo.service.UserService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.Map;

@RestController
@RequestMapping("/tasks")
public class TaskController {

    private final TaskService taskService;
    private final UserService userService;

    public TaskController(TaskService taskService, UserService userService) {
        this.taskService = taskService;
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
    public ResponseEntity<List<Task>> getTasks(@RequestHeader("Authorization") String authHeader) {
        User user = getUserFromToken(authHeader);
        return ResponseEntity.ok(taskService.getTasks(user));
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@RequestHeader("Authorization") String authHeader,
                                           @RequestBody TaskRequest request) {
        User user = getUserFromToken(authHeader);
        Task task = new Task(request.getTitle(), request.getDescription(), request.isCompleted(), user);
        task.setCategoryMask(request.getCategoryMask());
        return ResponseEntity.ok(taskService.createTask(task));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTask(@RequestHeader("Authorization") String authHeader,
                                        @PathVariable Long id,
                                        @RequestBody TaskRequest request) {
        User user = getUserFromToken(authHeader);
        Optional<Task> existing = taskService.getTaskById(id);
        if (existing.isEmpty() || !existing.get().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Forbidden");
        }
        Task task = existing.get();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setCompleted(request.isCompleted());
        task.setCategoryMask(request.getCategoryMask());
        return ResponseEntity.ok(taskService.updateTask(task));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@RequestHeader("Authorization") String authHeader,
                                        @PathVariable Long id) {
        User user = getUserFromToken(authHeader);
        Optional<Task> existing = taskService.getTaskById(id);
        if (existing.isEmpty() || !existing.get().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Forbidden");
        }
        taskService.deleteTask(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }
}