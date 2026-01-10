import 'package:dartz/dartz.dart';

import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/utils/auth_helper.dart';
import '../../../kitchen/data/models/order_model.dart';
import '../../domain/entities/cash_summary_entity.dart';
import '../../domain/entities/order_with_payment_entity.dart';
import '../../domain/entities/payment_entity.dart';
import '../../domain/repositories/kasir_repository.dart';
import '../datasources/kasir_local_datasource.dart';
import '../datasources/kasir_remote_datasource.dart';
import '../models/cash_summary_model.dart';
import '../models/payment_model.dart';

class KasirRepositoryImpl implements KasirRepository {
  final KasirRemoteDataSource remoteDataSource;
  final KasirLocalDataSource localDataSource;

  KasirRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  @override
  Future<Either<Failure, List<OrderWithPaymentEntity>>> getPendingPayments() async {
    try {
      final ordersData = await remoteDataSource.getPendingPayments();
      final orders = ordersData.map((data) => _mapToOrderWithPayment(data)).toList();
      return Right(orders);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<OrderWithPaymentEntity>>> getTodayOrders() async {
    try {
      final ordersData = await remoteDataSource.getTodayOrders();
      final orders = ordersData.map((data) => _mapToOrderWithPayment(data)).toList();
      return Right(orders);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Stream<Either<Failure, List<OrderWithPaymentEntity>>> watchOrders() async* {
    try {
      await for (final ordersData in remoteDataSource.watchOrders()) {
        final orders = ordersData.map((data) => _mapToOrderWithPayment(data)).toList();
        yield Right(orders);
      }
    } on ServerException catch (e) {
      yield Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      yield Left(NetworkFailure(e.message));
    } catch (e) {
      yield Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, PaymentEntity>> verifyPayment(String paymentId) async {
    try {
      // Get employee ID from auth
      final employeeId = await AuthHelper.getCurrentEmployeeId();
      final payment = await remoteDataSource.verifyPayment(paymentId, employeeId);
      return Right(payment);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, PaymentEntity>> getPaymentByOrderId(String orderId) async {
    // Implementation would query payments by order_id
    return Left(ServerFailure('Not implemented'));
  }

  @override
  Future<Either<Failure, CashSummaryEntity>> createCashSummary(CashSummaryEntity summary) async {
    try {
      final model = CashSummaryModel.fromEntity(summary);
      final result = await remoteDataSource.createCashSummary(model);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, CashSummaryEntity?>> getTodayCashSummary() async {
    return Left(ServerFailure('Not implemented'));
  }

  @override
  Future<Either<Failure, List<CashSummaryEntity>>> getCashSummaries({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    return Left(ServerFailure('Not implemented'));
  }

  OrderWithPaymentEntity _mapToOrderWithPayment(Map<String, dynamic> data) {
    try {
      final order = OrderModel.fromJson(data);
      PaymentEntity? payment;

      // Check if there's a separate payments table join
      if (data['payment'] != null && data['payment'] is List && (data['payment'] as List).isNotEmpty) {
        final paymentData = (data['payment'] as List).first;
        if (paymentData != null && paymentData is Map<String, dynamic>) {
          payment = PaymentModel.fromJson(paymentData);
        }
      }
      // Otherwise, create payment from order columns if payment data exists
      else if (data['payment_method'] != null && data['payment_status'] != null) {
        payment = PaymentEntity(
          id: data['id'] ?? '', // Use order ID as payment ID for now
          orderId: data['id'] ?? '',
          orderNumber: data['order_number'] ?? '',
          amount: double.tryParse(data['total_amount']?.toString() ?? '0') ?? 0.0,
          paymentMethod: data['payment_method'] ?? 'cash',
          status: data['payment_status'] ?? 'pending',
          proofImageUrl: data['payment_proof_url'],
          verifiedBy: data['payment_verified_by'],
          verifiedByName: null, // Not available in orders table
          verifiedAt: data['payment_verified_at'] != null
              ? DateTime.parse(data['payment_verified_at'])
              : null,
          notes: null,
          createdAt: DateTime.parse(data['created_at']),
          updatedAt: DateTime.parse(data['updated_at']),
        );
      }

      return OrderWithPaymentEntity(order: order, payment: payment);
    } catch (e, stackTrace) {
      print('❌ Error mapping order: $e');
      print('Data: $data');
      print('Stack trace: $stackTrace');
      rethrow;
    }
  }
}
