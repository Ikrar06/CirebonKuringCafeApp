import 'package:equatable/equatable.dart';

import '../../../../core/constants/device_types.dart';

class DeviceEntity extends Equatable {
  final String id;
  final String name;
  final DeviceType type;
  final bool isActive;
  final String? lastLoginAt;

  const DeviceEntity({
    required this.id,
    required this.name,
    required this.type,
    required this.isActive,
    this.lastLoginAt,
  });

  @override
  List<Object?> get props => [id, name, type, isActive, lastLoginAt];
}
