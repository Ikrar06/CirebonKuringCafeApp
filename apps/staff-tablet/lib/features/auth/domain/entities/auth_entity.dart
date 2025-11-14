import 'package:equatable/equatable.dart';

import 'device_entity.dart';
import 'employee_entity.dart';

class AuthEntity extends Equatable {
  final String token;
  final DeviceEntity device;
  final EmployeeEntity? employee;
  final DateTime expiresAt;

  const AuthEntity({
    required this.token,
    required this.device,
    this.employee,
    required this.expiresAt,
  });

  bool get isDeviceOnly => employee == null;
  bool get isEmployeeLoggedIn => employee != null;
  bool get isExpired => DateTime.now().isAfter(expiresAt);

  @override
  List<Object?> get props => [token, device, employee, expiresAt];
}
