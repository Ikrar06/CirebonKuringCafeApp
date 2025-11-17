import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/stock_item_entity.dart';
import '../repositories/stock_repository.dart';

class GetStockItemsUseCase implements UseCase<List<StockItemEntity>, NoParams> {
  final StockRepository repository;

  GetStockItemsUseCase(this.repository);

  @override
  Future<Either<Failure, List<StockItemEntity>>> call(NoParams params) async {
    return await repository.getStockItems();
  }
}
