import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/stock_movement_entity.dart';
import '../repositories/stock_repository.dart';

class CreateStockMovementUseCase implements UseCase<StockMovementEntity, StockMovementEntity> {
  final StockRepository repository;

  CreateStockMovementUseCase(this.repository);

  @override
  Future<Either<Failure, StockMovementEntity>> call(StockMovementEntity params) async {
    return await repository.createStockMovement(params);
  }
}
