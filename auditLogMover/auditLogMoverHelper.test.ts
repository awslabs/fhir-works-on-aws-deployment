/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import moment from 'moment';

import { AuditLogMoverHelper } from './auditLogMoverHelper';

describe('getEachDayInTimeFrame', () => {
    test('Get three days worth of dates', () => {
        const startDate = moment('2020-06-12');
        const endDate = moment('2020-06-15');

        const days = AuditLogMoverHelper.getEachDayInTimeFrame(startDate, endDate);

        const dates = days.map((day) => {
            return day.format('GGGG-MM-DD');
        });

        expect(dates).toEqual(['2020-06-12', '2020-06-13', '2020-06-14']);
    });
    test('Get one days worth of dates', () => {
        const startDate = moment('2020-06-12').startOf('day');
        const endDate = moment('2020-06-12').endOf('day');

        const days = AuditLogMoverHelper.getEachDayInTimeFrame(startDate, endDate);

        const dates = days.map((day) => {
            return day.format('GGGG-MM-DD');
        });

        expect(dates).toEqual(['2020-06-12']);
    });
    test('End date is earlier than start date', () => {
        expect.hasAssertions();
        const startDate = moment('2020-06-13').startOf('day');
        const endDate = moment('2020-06-12').endOf('day');

        try {
            AuditLogMoverHelper.getEachDayInTimeFrame(startDate, endDate);
        } catch (e) {
            expect((e as any).message).toEqual('startTime can not be later than endTime');
        }
    });
});
