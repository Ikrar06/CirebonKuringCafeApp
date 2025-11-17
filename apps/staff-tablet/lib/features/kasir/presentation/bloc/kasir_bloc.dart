import 'package:dartz/dartz.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/order_with_payment_entity.dart';
import '../../../../services/notification_service.dart';
import '../../domain/usecases/create_cash_summary_usecase.dart';
import '../../domain/usecases/get_pending_payments_usecase.dart';
import '../../domain/usecases/verify_payment_usecase.dart';
import '../../domain/usecases/watch_orders_usecase.dart';
import 'kasir_event.dart';
import 'kasir_state.dart';

class KasirBloc extends Bloc<KasirEvent, KasirState> {
  final GetPendingPaymentsUseCase getPendingPaymentsUseCase;
  final VerifyPaymentUseCase verifyPaymentUseCase;
  final WatchOrdersUseCase watchOrdersUseCase;
  final CreateCashSummaryUseCase createCashSummaryUseCase;
  final NotificationService notificationService;

  KasirBloc({
    required this.getPendingPaymentsUseCase,
    required this.verifyPaymentUseCase,
    required this.watchOrdersUseCase,
    required this.createCashSummaryUseCase,
    required this.notificationService,
  }) : super(KasirInitial()) {
    on<WatchOrders>(_onWatchOrders);
    on<LoadPendingPayments>(_onLoadPendingPayments);
    on<VerifyPayment>(_onVerifyPayment);
    on<CreateCashSummary>(_onCreateCashSummary);
  }

  Future<void> _onWatchOrders(WatchOrders event, Emitter<KasirState> emit) async {
    print('🔄 KasirBloc: WatchOrders event triggered');
    await emit.forEach<Either<Failure, List<OrderWithPaymentEntity>>>(
      watchOrdersUseCase(),
      onData: (result) {
        return result.fold(
          (failure) {
            print('❌ KasirBloc: Error - ${failure.message}');
            return KasirError(failure.message);
          },
          (orders) {
            print('✅ KasirBloc: Received ${orders.length} orders');
            // Filter pending payments
            final pendingPayments = orders.where((o) => o.isPendingPayment).toList();
            print('💰 KasirBloc: ${pendingPayments.length} pending payments');

            // Notify for new payment verifications needed
            for (var order in pendingPayments) {
              if (order.payment?.needsVerification ?? false) {
                notificationService.notifyPaymentVerification(
                  orderNumber: order.order.orderNumber,
                  amount: order.totalAmount,
                );
              }
            }

            if (state is KasirLoaded) {
              return (state as KasirLoaded).copyWith(
                orders: orders,
                pendingPayments: pendingPayments,
              );
            } else {
              return KasirLoaded(orders: orders, pendingPayments: pendingPayments);
            }
          },
        );
      },
      onError: (error, stackTrace) => KasirError(error.toString()),
    );
  }

  Future<void> _onLoadPendingPayments(LoadPendingPayments event, Emitter<KasirState> emit) async {
    emit(KasirLoading());

    final result = await getPendingPaymentsUseCase(const NoParams());

    result.fold(
      (failure) => emit(KasirError(failure.message)),
      (payments) => emit(KasirLoaded(pendingPayments: payments)),
    );
  }

  Future<void> _onVerifyPayment(VerifyPayment event, Emitter<KasirState> emit) async {
    final result = await verifyPaymentUseCase(event.paymentId);

    result.fold(
      (failure) => emit(KasirError(failure.message)),
      (payment) => emit(const KasirOperationSuccess('Pembayaran berhasil diverifikasi')),
    );
  }

  Future<void> _onCreateCashSummary(CreateCashSummary event, Emitter<KasirState> emit) async {
    final result = await createCashSummaryUseCase(event.summary);

    result.fold(
      (failure) => emit(KasirError(failure.message)),
      (summary) => emit(const KasirOperationSuccess('Rekap kas berhasil disimpan')),
    );
  }

  @override
  Future<void> close() {
    return super.close();
  }
}
