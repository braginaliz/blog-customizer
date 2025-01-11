import clsx from 'clsx';
import { useState, CSSProperties } from 'react';

import {
    ArticleStateType,
    defaultArticleState,
} from '../../constants/articleProps';
import { Article } from '../article';
import { ArticleParamsForm } from '../article-params-form';

import styles from './App.module.scss';

export const App = () => {
    // Переименование appState в articleState для лучшего понимания его назначения
    const [articleState, setArticleState] =
        useState<ArticleStateType>(defaultArticleState);

    return (
        <div
			className={clsx(styles.main)}
            style={
                {
                    '--font-family': articleState.fontFamilyOption.value,
                    '--font-size': articleState.fontSizeOption.value,
                    '--font-color': articleState.fontColor.value,
                    '--container-width': articleState.contentWidth.value,
                    '--bg-color': articleState.backgroundColor.value,
                } as CSSProperties
            }>
            <ArticleParamsForm setAppState={setArticleState} />
            <Article />
        </div>
    );
};