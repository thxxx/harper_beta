import LinkChips from '@/components/information/LinkChips';
import { useMessages } from '@/i18n/useMessage';
import { replaceName } from '@/utils/textprocess'
import { Loader2 } from 'lucide-react';
import React, { useState } from 'react'

const ProfileBio = ({ summary, bio, name, oneline, isLoadingOneline, links }: { summary: { text: string }[], bio: string, name: string, oneline: string, isLoadingOneline: boolean, links: string[] }) => {
    const [isBioOpen, setIsBioOpen] = useState(false);
    const { m } = useMessages();

    console.log('summary', summary, oneline, isLoadingOneline);
    return (
        <div className="text-hgray900 flex flex-col gap-2 mb-2">
            <div className="flex flex-row items-center justify-between gap-2">
                <div className="text-base font-normal">{m.data.summary}</div>
                {bio && (
                    <div
                        className="text-sm text-ngray600 font-normal cursor-pointer hover:text-accenta1 transition-all duration-200"
                        onClick={() => setIsBioOpen(!isBioOpen)}
                    >
                        {isBioOpen ? "접기" : "더보기"}
                    </div>
                )}
            </div>
            {summary && summary.length > 0 && (
                <div>{replaceName(summary[0].text, name)}</div>
            )}
            {(!summary || summary.length === 0) && oneline && (
                <div>{replaceName(oneline, name)}</div>
            )}
            {(!summary || summary.length === 0) && isLoadingOneline && !oneline && (
                <div className="flex flex-row items-center gap-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <div className="animate-textGlow text-sm">
                        설명을 작성중입니다...
                    </div>
                </div>
            )}

            {bio && (
                <div className="text-[15px] text-hgray700 leading-6 font-light mt-1">
                    {isBioOpen ? (
                        <div className="whitespace-pre-wrap">
                            {replaceName(bio, name)}
                        </div>
                    ) : (
                        <div className="line-clamp-1">{replaceName(bio, name)}</div>
                    )}
                </div>
            )}
            {/* Emails + Links */}
            <div className="flex flex-row gap-1 mt-4">
                {links.length === 0 ? (
                    <div className="text-sm text-xgray600">No links</div>
                ) : (
                    <div className="space-y-1">
                        <LinkChips links={links} />
                    </div>
                )}
            </div>
        </div>
    )
}

export default React.memo(ProfileBio)