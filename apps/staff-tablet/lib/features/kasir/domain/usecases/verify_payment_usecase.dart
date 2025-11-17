import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/payment_entity.dart';
import '../repositories/kasir_repository.dart';

class VerifyPaymentUseCase implements UseCase<PaymentEntity, String> {
  final KasirRepository repository;

  VerifyPaymentUseCase(this.repository);

  @override
  Future<Either<Failure, PaymentEntity>> call(String params) async {
    return await repository.verifyPayment(params);
  }
}
