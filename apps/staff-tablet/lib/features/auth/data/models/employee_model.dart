import '../../domain/entities/employee_entity.dart';

class EmployeeModel extends EmployeeEntity {
  const EmployeeModel({
    required super.id,
    required super.name,
    required super.email,
    required super.phone,
    required super.role,
    required super.isActive,
    super.photoUrl,
  });

  // From JSON (API response)
  factory EmployeeModel.fromJson(Map<String, dynamic> json) {
    return EmployeeModel(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String,
      role: json['role'] as String,
      isActive: json['is_active'] as bool? ?? true,
      photoUrl: json['photo_url'] as String?,
    );
  }

  // To JSON (API request)
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'role': role,
      'is_active': isActive,
      if (photoUrl != null) 'photo_url': photoUrl,
    };
  }

  // From Entity
  factory EmployeeModel.fromEntity(EmployeeEntity entity) {
    return EmployeeModel(
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      role: entity.role,
      isActive: entity.isActive,
      photoUrl: entity.photoUrl,
    );
  }

  // To Entity
  EmployeeEntity toEntity() {
    return EmployeeEntity(
      id: id,
      name: name,
      email: email,
      phone: phone,
      role: role,
      isActive: isActive,
      photoUrl: photoUrl,
    );
  }
}
