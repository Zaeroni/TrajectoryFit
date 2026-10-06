package com.trajectoryfit.web;

import com.trajectoryfit.domain.UserEntity;
import com.trajectoryfit.repo.UserRepository;
import com.trajectoryfit.service.Units;
import com.trajectoryfit.web.dto.CreateUserRequest;
import com.trajectoryfit.web.dto.UpdateUserRequest;
import com.trajectoryfit.web.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest req) {
        UserEntity u = new UserEntity();
        u.setName(req.name());
        u.setHeightCm(req.heightIn() == null ? null : Units.inToCm(req.heightIn()));
        u.setGoalWeightKg(req.goalWeightLb() == null ? null : Units.lbToKg(req.goalWeightLb()));
        if (req.medication() != null) {
            u.setMedication(req.medication());
        }
        if (req.loggingPreference() != null) {
            u.setLoggingPreference(req.loggingPreference());
        }
        if (req.bodyCompAccess() != null) {
            u.setBodyCompAccess(req.bodyCompAccess().toArray(new String[0]));
        }
        return UserResponse.from(users.save(u));
    }

    /** List all users. Handy for the demo UI to pick a seeded archetype to view. */
    @GetMapping
    public List<UserResponse> list() {
        return users.findAll(Sort.by("name")).stream().map(UserResponse::from).toList();
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable UUID id) {
        return UserResponse.from(requireUser(id));
    }

    /** Partial update used by Settings; omitted fields are left as they are. */
    @PatchMapping("/{id}")
    public UserResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest req) {
        UserEntity u = requireUser(id);
        if (req.name() != null) {
            if (req.name().isBlank()) {
                throw new BadRequestException("name must not be blank");
            }
            u.setName(req.name().trim());
        }
        if (req.heightIn() != null) {
            u.setHeightCm(Units.inToCm(req.heightIn()));
        }
        if (req.goalWeightLb() != null) {
            u.setGoalWeightKg(Units.lbToKg(req.goalWeightLb()));
        }
        if (req.medication() != null) {
            u.setMedication(req.medication());
        }
        if (req.loggingPreference() != null) {
            u.setLoggingPreference(req.loggingPreference());
        }
        if (req.bodyCompAccess() != null) {
            u.setBodyCompAccess(req.bodyCompAccess().toArray(new String[0]));
        }
        return UserResponse.from(users.save(u));
    }

    private UserEntity requireUser(UUID id) {
        return users.findById(id).orElseThrow(() -> new NotFoundException("User " + id + " not found"));
    }
}
