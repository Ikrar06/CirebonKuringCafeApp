import '../../domain/entities/auth_entity.dart';
import 'device_model.dart';
import 'employee_model.dart';

class AuthModel extends AuthEntity {
  const AuthModel({
    required super.token,
    required DeviceModel super.device,
    EmployeeModel? super.employee,
    required super.expiresAt,
  });

  // From JSON (API response)
  factory AuthModel.fromJson(Map<String, dynamic> json) {
    return AuthModel(
      token: json['token'] as String,
      device: DeviceModel.fromJson(json['device'] as Map<String, dynamic>),
      employee: json['employee'] != null
          ? EmployeeModel.fromJson(json['employee'] as Map<String, dynamic>)
          : null,
      expiresAt: DateTime.parse(json['expires_at'] as String),
    );
  }

  // To JSON (for local storage)
  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'device': (device as DeviceModel).toJson(),
      if (employee != null) 'employee': (employee as EmployeeModel).toJson(),
      'expires_at': expiresAt.toIso8601String(),
    };
  }

  // From Entity
  factory AuthModel.fromEntity(AuthEntity entity) {
    return AuthModel(
      token: entity.token,
      device: DeviceModel.fromEntity(entity.device),
      employee: entity.employee != null
          ? EmployeeModel.fromEntity(entity.employee!)
          : null,
      expiresAt: entity.expiresAt,
    );
  }

  // To Entity
  AuthEntity toEntity() {
    return AuthEntity(
      token: token,
      device: device,
      employee: employee,
      expiresAt: expiresAt,
    );
  }
}
