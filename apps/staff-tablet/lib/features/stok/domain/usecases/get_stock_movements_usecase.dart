import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/stock_movement_entity.dart';
import '../repositories/stock_repository.dart';

class GetStockMovementsUseCase implements UseCase<List<StockMovementEntity>, String> {
  final StockRepository repository;

  GetStockMovementsUseCase(this.repository);

  @override
  Future<Either<Failure, List<StockMovementEntity>>> call(String params) async {
    return await repository.getStockMovements(params);
  }
}
