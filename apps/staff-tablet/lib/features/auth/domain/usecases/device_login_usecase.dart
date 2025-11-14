import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/constants/device_types.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/auth_entity.dart';
import '../repositories/auth_repository.dart';

class DeviceLoginUseCase implements UseCase<AuthEntity, DeviceLoginParams> {
  final AuthRepository repository;

  DeviceLoginUseCase(this.repository);

  @override
  Future<Either<Failure, AuthEntity>> call(DeviceLoginParams params) async {
    return await repository.deviceLogin(
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      deviceType: params.deviceType,
    );
  }
}

class DeviceLoginParams extends Equatable {
  final String deviceId;
  final String deviceName;
  final DeviceType deviceType;

  const DeviceLoginParams({
    required this.deviceId,
    required this.deviceName,
    required this.deviceType,
  });

  @override
  List<Object> get props => [deviceId, deviceName, deviceType];
}
