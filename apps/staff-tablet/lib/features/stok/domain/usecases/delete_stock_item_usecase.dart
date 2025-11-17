import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/stock_repository.dart';

class DeleteStockItemUseCase implements UseCase<void, String> {
  final StockRepository repository;

  DeleteStockItemUseCase(this.repository);

  @override
  Future<Either<Failure, void>> call(String params) async {
    return await repository.deleteStockItem(params);
  }
}
