import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/order_entity.dart';
import '../repositories/order_repository.dart';

class UpdateOrderStatusUseCase
    implements UseCase<OrderEntity, UpdateOrderStatusParams> {
  final OrderRepository repository;

  UpdateOrderStatusUseCase(this.repository);

  @override
  Future<Either<Failure, OrderEntity>> call(
      UpdateOrderStatusParams params) async {
    return await repository.updateOrderStatus(
      orderId: params.orderId,
      status: params.status,
    );
  }
}

class UpdateOrderStatusParams extends Equatable {
  final String orderId;
  final String status;

  const UpdateOrderStatusParams({
    required this.orderId,
    required this.status,
  });

  @override
  List<Object> get props => [orderId, status];
}
