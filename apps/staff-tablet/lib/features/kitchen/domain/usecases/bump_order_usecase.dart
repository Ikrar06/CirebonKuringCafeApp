import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/order_repository.dart';

class BumpOrderUseCase implements UseCase<void, BumpOrderParams> {
  final OrderRepository repository;

  BumpOrderUseCase(this.repository);

  @override
  Future<Either<Failure, void>> call(BumpOrderParams params) async {
    return await repository.bumpOrder(params.orderId);
  }
}

class BumpOrderParams extends Equatable {
  final String orderId;

  const BumpOrderParams({required this.orderId});

  @override
  List<Object> get props => [orderId];
}
