import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/order_with_payment_entity.dart';
import '../repositories/kasir_repository.dart';

class GetPendingPaymentsUseCase implements UseCase<List<OrderWithPaymentEntity>, NoParams> {
  final KasirRepository repository;

  GetPendingPaymentsUseCase(this.repository);

  @override
  Future<Either<Failure, List<OrderWithPaymentEntity>>> call(NoParams params) async {
    return await repository.getPendingPayments();
  }
}
