import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/stock_item_entity.dart';
import '../repositories/stock_repository.dart';

class UpdateStockItemUseCase implements UseCase<StockItemEntity, StockItemEntity> {
  final StockRepository repository;

  UpdateStockItemUseCase(this.repository);

  @override
  Future<Either<Failure, StockItemEntity>> call(StockItemEntity params) async {
    return await repository.updateStockItem(params);
  }
}
