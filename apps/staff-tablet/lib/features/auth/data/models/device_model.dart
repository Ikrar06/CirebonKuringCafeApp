import '../../../../core/constants/device_types.dart';
import '../../domain/entities/device_entity.dart';

class DeviceModel extends DeviceEntity {
  const DeviceModel({
    required super.id,
    required super.name,
    required super.type,
    required super.isActive,
    super.lastLoginAt,
  });

  // From JSON (API response)
  factory DeviceModel.fromJson(Map<String, dynamic> json) {
    return DeviceModel(
      id: json['id'] as String,
      name: json['name'] as String,
      type: DeviceType.fromString(json['type'] as String?) ?? DeviceType.kasir,
      isActive: json['is_active'] as bool? ?? true,
      lastLoginAt: json['last_login_at'] as String?,
    );
  }

  // To JSON (API request)
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type.name,
      'is_active': isActive,
      if (lastLoginAt != null) 'last_login_at': lastLoginAt,
    };
  }

  // From Entity
  factory DeviceModel.fromEntity(DeviceEntity entity) {
    return DeviceModel(
      id: entity.id,
      name: entity.name,
      type: entity.type,
      isActive: entity.isActive,
      lastLoginAt: entity.lastLoginAt,
    );
  }

  // To Entity
  DeviceEntity toEntity() {
    return DeviceEntity(
      id: id,
      name: name,
      type: type,
      isActive: isActive,
      lastLoginAt: lastLoginAt,
    );
  }
}
