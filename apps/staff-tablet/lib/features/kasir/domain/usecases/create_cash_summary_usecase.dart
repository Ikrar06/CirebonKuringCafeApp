import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/cash_summary_entity.dart';
import '../repositories/kasir_repository.dart';

class CreateCashSummaryUseCase implements UseCase<CashSummaryEntity, CashSummaryEntity> {
  final KasirRepository repository;

  CreateCashSummaryUseCase(this.repository);

  @override
  Future<Either<Failure, CashSummaryEntity>> call(CashSummaryEntity params) async {
    return await repository.createCashSummary(params);
  }
}
