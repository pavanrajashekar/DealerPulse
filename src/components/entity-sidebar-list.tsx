import React from 'react';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';

export type SidebarItem = {
    id: string;
    title: string;
    subtitle?: React.ReactNode;
    metricText?: React.ReactNode;
    badgeText?: string;
    badgeColor?: 'green' | 'amber' | 'red' | 'primary' | 'muted' | 'default';
    trend?: number | null; // e.g. for +5% or -2%
};

interface EntitySidebarListProps {
    title: string;
    items: SidebarItem[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    showSearch?: boolean;
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
    searchPlaceholder?: string;
    filterElement?: React.ReactNode;
    widthClass?: string;
}

export function EntitySidebarList({
    items,
    selectedId,
    onSelect,
    showSearch,
    searchTerm,
    onSearchChange,
    searchPlaceholder = 'Search...',
    filterElement,
    widthClass = 'w-1/3 md:w-1/4 lg:w-1/5'
}: EntitySidebarListProps) {
    const getBadgeClasses = (color?: string) => {
        switch (color) {
            case 'green': return 'bg-green-500/10 text-green-500';
            case 'amber': return 'bg-amber-500/10 text-amber-500';
            case 'red': return 'bg-red-500/10 text-red-500';
            case 'primary': return 'bg-primary/10 text-primary';
            case 'muted': return 'bg-muted text-muted-foreground';
            default: return 'bg-muted/10 text-foreground';
        }
    };

    return (
        <div className={`${widthClass} border-r border-border flex flex-col bg-card hidden md:flex flex-shrink-0`}>
            <div className="p-4 border-b border-border bg-card flex-shrink-0">
                {showSearch && (
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm || ''}
                            onChange={e => onSearchChange?.(e.target.value)}
                            className="w-full bg-muted/30 border border-border rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                    </div>
                )}
                {filterElement && (
                    <div className="mt-3">
                        {filterElement}
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col">
                {items.map(item => {
                    const isSelected = selectedId === item.id;
                    const isGrowing = item.trend !== undefined && item.trend !== null && item.trend >= 0;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            className={`group relative w-full p-4 text-left transition-all border-b border-border/60 ${isSelected
                                ? 'bg-transparent'
                                : 'bg-transparent hover:bg-muted/30'
                                }`}
                        >
                            {isSelected && (
                                <span className="absolute left-0 top-0 h-full w-1 bg-primary animate-in fade-in slide-in-from-left-1" />
                            )}
                            <div className="flex justify-between items-start mb-1.5">
                                <h3 className={`text-sm font-semibold truncate pr-2 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                    {item.title}
                                </h3>
                                {item.badgeText && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${getBadgeClasses(item.badgeColor)}`}>
                                        {item.badgeText}
                                    </span>
                                )}
                                {item.trend !== undefined && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center ${isGrowing ? 'bg-green-500/10 text-green-500' : item.trend === null ? 'bg-muted/10 text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                                        {isGrowing ? <TrendingUp className="w-3 h-3 mr-1" /> : item.trend !== null ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                                        {item.trend !== null ? `${Math.abs(item.trend).toFixed(0)}%` : 'New'}
                                    </span>
                                )}
                            </div>
                            {item.subtitle && (
                                <p className="text-sm text-muted-foreground mb-1">{item.subtitle}</p>
                            )}
                            {item.metricText && (
                                <p className="text-xs text-muted-foreground font-medium">{item.metricText}</p>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
