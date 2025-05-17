interface DefaultButtonProps{
    onClick: () => void;
    disabled?: boolean,
    children: React.ReactNode
}

export default function Button({onClick, disabled = false, children}: DefaultButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`self-center bg-(--button-primary) md:text-lg text-xs transition-all duration-200 text-white font-semibold py-2 md:px-16 px-8 rounded-4xl ${!disabled ? 'opacity-100' : 'opacity-50'} ${!disabled ? ' hover:bg-(--button-hover)' : ''} ${!disabled ? 'cursor-pointer' : 'cursor-default'}`}
        >
            {children}
        </button>
    )
}
