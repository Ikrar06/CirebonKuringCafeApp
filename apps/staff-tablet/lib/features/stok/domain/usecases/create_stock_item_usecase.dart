import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/stock_item_entity.dart';
import '../repositories/stock_repository.dart';

class CreateStockItemUseCase implements UseCase<StockItemEntity, StockItemEntity> {
  final StockRepository repository;

  CreateStockItemUseCase(this.repository);

  @override
  Future<Either<Failure, StockItemEntity>> call(StockItemEntity params) async {
    return await repository.createStockItem(params);
  }
}
