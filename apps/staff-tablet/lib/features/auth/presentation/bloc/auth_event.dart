import 'package:equatable/equatable.dart';

import '../../../../core/constants/device_types.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// Check if user is already authenticated
class CheckAuthStatusEvent extends AuthEvent {
  const CheckAuthStatusEvent();
}

/// Device login event
class DeviceLoginEvent extends AuthEvent {
  final String deviceId;
  final String deviceName;
  final DeviceType deviceType;

  const DeviceLoginEvent({
    required this.deviceId,
    required this.deviceName,
    required this.deviceType,
  });

  @override
  List<Object> get props => [deviceId, deviceName, deviceType];
}

/// Employee login event
class EmployeeLoginEvent extends AuthEvent {
  final String pin;

  const EmployeeLoginEvent({required this.pin});

  @override
  List<Object> get props => [pin];
}

/// Logout event
class LogoutEvent extends AuthEvent {
  const LogoutEvent();
}
