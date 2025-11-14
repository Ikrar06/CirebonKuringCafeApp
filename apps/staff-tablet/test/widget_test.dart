// Basic Flutter widget test for Staff Tablet app

import 'package:flutter_test/flutter_test.dart';

import 'package:staff_tablet/app.dart';

void main() {
  testWidgets('Staff Tablet app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const StaffTabletApp());

    // Verify that the app builds without errors
    expect(find.byType(StaffTabletApp), findsOneWidget);
  });
}
