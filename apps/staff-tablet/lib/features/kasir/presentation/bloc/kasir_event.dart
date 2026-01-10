import 'package:equatable/equatable.dart';

import '../../domain/entities/cash_summary_entity.dart';

abstract class KasirEvent extends Equatable {
  const KasirEvent();

  @override
  List<Object?> get props => [];
}

class WatchOrders extends KasirEvent {}

class RefreshOrders extends KasirEvent {}

class LoadPendingPayments extends KasirEvent {}

class VerifyPayment extends KasirEvent {
  final String paymentId;

  const VerifyPayment(this.paymentId);

  @override
  List<Object?> get props => [paymentId];
}

class CreateCashSummary extends KasirEvent {
  final CashSummaryEntity summary;

  const CreateCashSummary(this.summary);

  @override
  List<Object?> get props => [summary];
}
