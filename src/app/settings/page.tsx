'use client';

import React, { useState, useMemo } from 'react';
import {
    ChevronUp,
    ChevronDown,
    ChevronsUpDown
} from 'lucide-react';
import { dealershipData } from '@/lib/dealership-data';

export default function SettingsPage() {

    // States
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);


    // Get December 2025 Targets
    const decTargets = useMemo(() => {
        let targets = dealershipData.targets.filter(t => t.month === '2025-12');

        if (sortConfig) {
            targets = [...targets].sort((a, b) => {
                let aVal: any = a[sortConfig.key as keyof typeof a];
                let bVal: any = b[sortConfig.key as keyof typeof b];

                // special case for branch name
                if (sortConfig.key === 'branch_name') {
                    aVal = dealershipData.branches.find(br => br.id === a.branch_id)?.name || 'Unknown';
                    bVal = dealershipData.branches.find(br => br.id === b.branch_id)?.name || 'Unknown';
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return targets;
    }, [sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="flex flex-col h-full w-full bg-background">
            {/* PAGE HEADER */}
            <div className="h-16 border-b border-border px-4 md:px-6 flex items-center justify-between flex-shrink-0 bg-card z-10 sticky top-0">
                <div className="flex items-center">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
                </div>
            </div>

            {/* PAGE CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6  space-y-4 pb-24 md:pb-12 max-w-4xl">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Removed API Section */}

                    {/* Theme settings removed */}

                    {/* December Targets Overrides Display */}
                    <div className="bg-card card-base border border-border rounded-md p-5 shadow-sm space-y-4 md:col-span-2">
                        <div className="flex items-center space-x-2">
                            <h4 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">December 2025 Targets Directory</h4>
                        </div>

                        <p className="text-xs text-muted-foreground leading-normal">
                            Below is the list of targets assigned to each branch for the current month. These values are used to calculate achievement ratios throughout the system.
                        </p>

                        <div className="overflow-hidden border border-border/50 rounded-3xl shadow-sm">
                            <table className="w-full text-xs text-left relative border-collapse">
                                <thead className="bg-card border-b border-border/60">
                                    <tr className="text-muted-foreground font-bold tracking-wide uppercase text-xs">
                                        <th className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('branch_id')}>
                                            <div className="flex items-center space-x-1.5">
                                                <span>Branch Code</span>
                                                {sortConfig?.key === 'branch_id' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('branch_name')}>
                                            <div className="flex items-center space-x-1.5">
                                                <span>Branch Name</span>
                                                {sortConfig?.key === 'branch_name' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('target_units')}>
                                            <div className="flex items-center justify-end space-x-1.5">
                                                <span>Target Volume</span>
                                                {sortConfig?.key === 'target_units' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('target_revenue')}>
                                            <div className="flex items-center justify-end space-x-1.5">
                                                <span>Target Revenue</span>
                                                {sortConfig?.key === 'target_revenue' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    {decTargets.map((t, i) => {
                                        const bName = dealershipData.branches.find(b => b.id === t.branch_id)?.name || 'Unknown';
                                        return (
                                            <tr key={t.branch_id} className="hover:bg-muted/30 transition-colors group">
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                                                        {t.branch_id}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-bold text-foreground group-hover:text-primary transition-colors">{bName}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className="font-bold text-foreground">{t.target_units}</span>
                                                    <span className="text-muted-foreground ml-1">vehicles</span>
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-foreground">
                                                    ₹{(t.target_revenue / 10000000).toFixed(2)} <span className="text-muted-foreground font-medium">Cr</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
